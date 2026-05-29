import pytest
import pytest_asyncio
import asyncio
import time
from coopia_base_websockets.channellayers import ChannelLayerForCoopiaProcess
import redis.asyncio as redis


@pytest_asyncio.fixture
async def channel_layer():
    """Create a real Redis connection for testing"""
    cl = ChannelLayerForCoopiaProcess(
        prefix="test"
    )
    yield cl
    # Cleanup after tests
    connection = cl.connection(0)
    await connection.flushdb()


@pytest.mark.asyncio
async def test_add_idea(channel_layer):
    """Test adding ideas to a group"""
    await channel_layer.add_idea("group1", "idea1")
    best = await channel_layer.get_best_idea("group1")
    assert best == "idea1"


@pytest.mark.asyncio
async def test_get_ideas_count(channel_layer):
    """Test getting the number of ideas for a group"""
    # Initially 0
    count = await channel_layer.get_ideas_count("group1")
    assert count == 0

    # Add one idea
    await channel_layer.add_idea("group1", "idea1")
    count = await channel_layer.get_ideas_count("group1")
    assert count == 1

    # Add another
    await channel_layer.add_idea("group1", "idea2")
    count = await channel_layer.get_ideas_count("group1")
    assert count == 2


@pytest.mark.asyncio
async def test_loop_set_state_broadcasts(channel_layer):
    sent = []

    async def fake_group_send(group, message):
        sent.append((group, message))

    channel_layer.group_send = fake_group_send

    await channel_layer.cycle_set_params("group1", 5, 3, 2)
    await channel_layer.loop_set_state("group1", "running", 1000.0, 1020.0)

    assert sent, "group_send should be called"
    group, message = sent[-1]
    assert group == "group1"
    assert message["type"] == "send.loop.state"
    assert message["loop_state"]["state"] == "running"


@pytest.mark.asyncio
async def test_cycle_set_state_broadcasts(channel_layer):
    sent = []

    async def fake_group_send(group, message):
        sent.append((group, message))

    channel_layer.group_send = fake_group_send

    await channel_layer.cycle_set_state("group1", "generation", 0, 1000.0, 1005.0)

    assert sent, "group_send should be called"
    group, message = sent[-1]
    assert group == "group1"
    assert message["type"] == "send.cycle.state"
    assert message["cycle_state"]["current_phase"] == "generation"


@pytest.mark.asyncio
async def test_cycle_set_params_broadcasts(channel_layer):
    sent = []

    async def fake_group_send(group, message):
        sent.append((group, message))

    channel_layer.group_send = fake_group_send

    await channel_layer.cycle_set_params("group1", 4, 2, 3)

    assert sent, "group_send should be called"
    group, message = sent[-1]
    assert group == "group1"
    assert message["type"] == "send.cycle.params"
    assert message["cycle_params"]["nb_selections"] == 3


@pytest.mark.asyncio
async def test_register_preference(channel_layer):
    """Test that preferences update weights correctly"""
    await channel_layer.add_idea("group1", "idea1")
    await channel_layer.add_idea("group1", "idea2")
    
    # idea1 wins
    await channel_layer.register_preference("group1", "idea1", "idea2", 2.0)
    best = await channel_layer.get_best_idea("group1")
    assert best == "idea1"


@pytest.mark.asyncio
async def test_get_random_ideas(channel_layer):
    """Test weighted random sampling"""
    for i in range(10):
        await channel_layer.add_idea("group1", f"idea{i}")
    
    ideas = await channel_layer.get_random_ideas("group1", 5)
    assert len(ideas) == 5
    assert len(set(ideas)) == 5  # All distinct


@pytest.mark.asyncio
async def test_reset_ideas(channel_layer):
    """Test clearing ideas"""
    await channel_layer.add_idea("group1", "idea1")
    await channel_layer.reset_ideas("group1")
    best = await channel_layer.get_best_idea("group1")
    assert best is None


@pytest.mark.asyncio
async def test_reset_ideas_partial(channel_layer):
    """Test partial reset: remove low-weight ideas and reset remaining to 1.0"""
    # Add two ideas and bias one to have weight > 1.0
    await channel_layer.add_idea("group1", "keep")
    await channel_layer.add_idea("group1", "drop")

    # Make `keep` heavier
    await channel_layer.register_preference("group1", "keep", "drop", 3.0)

    conn = channel_layer.connection(channel_layer.consistent_hash("group1"))
    key = "test:ideas:group1"

    keep_score = await conn.zscore(key, "keep")
    drop_score = await conn.zscore(key, "drop")

    assert float(keep_score) > 1.0
    assert float(drop_score) <= 1.0

    # Partial reset: remove low-score ideas and reset remaining scores to 1.0
    await channel_layer.reset_ideas("group1", partial=True)

    drop_score_after = await conn.zscore(key, "drop")
    keep_score_after = await conn.zscore(key, "keep")

    assert drop_score_after is None
    assert float(keep_score_after) == 1.0


@pytest.mark.asyncio
async def test_get_random_ideas_bias(channel_layer):
    """Test that repeated preferences bias weighted sampling"""
    await channel_layer.add_idea("group1", "first")
    await channel_layer.add_idea("group1", "second")

    # Register preference for 'second' over 'first' 10 times
    for _ in range(10):
        await channel_layer.register_preference("group1", "second", "first", 1.5)

    counts = {"first": 0, "second": 0}

    # Draw 100 single samples and count appearances
    for _ in range(100):
        res = await channel_layer.get_random_ideas("group1", 1)
        if not res:
            continue
        picked = res[0]
        counts[picked] += 1

    assert counts["second"] > counts["first"]


@pytest.mark.asyncio
async def test_start_process(channel_layer):
    """Test starting a process initializes state correctly"""
    start_time = 1000.0
    end_time = 2000.0
    current_result = {"status": "initial"}
    
    await channel_layer.start_process("group1", nb_cycles=3, start_time=start_time, end_time=end_time, current_result=current_result)
    
    process_state = await channel_layer.get_process_state("group1")
    assert process_state["status"] == "running"
    assert process_state["current_cycle_index"] == 0
    assert process_state["nb_cycles"] == 3
    assert process_state["start_time"] == start_time
    assert process_state["end_time"] == end_time
    assert process_state["current_result"] == current_result
    
    cycle_state = await channel_layer.get_cycle_state("group1")
    assert cycle_state["phase"] == "generation"
    assert cycle_state["current_selection_index"] == 0
    assert cycle_state["nb_selections"] == 1


@pytest.mark.asyncio
async def test_end_process(channel_layer):
    """Test ending a process"""
    await channel_layer.start_process("group1", nb_cycles=1, start_time=1000.0, end_time=2000.0, current_result={})
    
    await channel_layer.end_process("group1")
    
    process_state = await channel_layer.get_process_state("group1")
    assert process_state["status"] == "ended"
    assert process_state["end_time"] > 1000.0  # Should be updated to current time


@pytest.mark.asyncio
async def test_tick_generation_to_selection(channel_layer):
    """Test tick transitions from generation phase to selection phase"""
    await channel_layer.start_process("group1", nb_cycles=1, start_time=1000.0, end_time=2000.0, current_result={})
    
    # set durations explicitly so timing expression is clear
    generation_duration = 2
    selection_duration = 1
    nb_selections = 1

    await channel_layer.start_cycle(
        "group1",
        generation_duration=generation_duration,
        selection_duration=selection_duration,
        nb_selections=nb_selections,
    )

    # Fast-forward time just beyond generation
    cycle_state = await channel_layer.get_cycle_state("group1")
    cycle_state["cycle_start"] = time.time() - (generation_duration + 0.1)
    await channel_layer.set_cycle_state("group1", cycle_state)

    await channel_layer.tick_process("group1")
    
    updated_cycle = await channel_layer.get_cycle_state("group1")
    assert updated_cycle["phase"] == "selection"
    assert updated_cycle["current_selection_index"] == 0


@pytest.mark.asyncio
async def test_tick_multiple_selections(channel_layer):
    """Test tick progresses through multiple selection phases in a cycle"""
    await channel_layer.start_process("group1", nb_cycles=1, start_time=1000.0, end_time=2000.0, current_result={})

    generation_duration = 2
    selection_duration = 1
    nb_selections = 3

    await channel_layer.start_cycle(
        "group1",
        generation_duration=generation_duration,
        selection_duration=selection_duration,
        nb_selections=nb_selections,
    )

    cycle_state = await channel_layer.get_cycle_state("group1")
    cycle_state["phase"] = "selection"
    cycle_state["cycle_start"] = time.time() - generation_duration
    await channel_layer.set_cycle_state("group1", cycle_state)

    # First tick: still first selection
    await channel_layer.tick_process("group1")
    cycle_state = await channel_layer.get_cycle_state("group1")
    assert cycle_state["current_selection_index"] == 0

    # Next: elapsed 1 more selection period
    cycle_state["cycle_start"] = time.time() - (generation_duration + selection_duration + 0.1)
    await channel_layer.set_cycle_state("group1", cycle_state)
    await channel_layer.tick_process("group1")
    cycle_state = await channel_layer.get_cycle_state("group1")
    assert cycle_state["current_selection_index"] == 1

    # Next: elapsed 2 more selection periods total
    cycle_state["cycle_start"] = time.time() - (generation_duration + 2 * selection_duration + 0.1)
    await channel_layer.set_cycle_state("group1", cycle_state)
    await channel_layer.tick_process("group1")
    cycle_state = await channel_layer.get_cycle_state("group1")
    assert cycle_state["current_selection_index"] == 2


@pytest.mark.asyncio
async def test_tick_cycle_completion(channel_layer):
    """Test tick completes cycle when all selections are done"""
    await channel_layer.start_process("group1", nb_cycles=3, start_time=1000.0, end_time=2000.0, current_result={})

    generation_duration = 2
    selection_duration = 1
    nb_selections = 1

    await channel_layer.start_cycle(
        "group1",
        generation_duration=generation_duration,
        selection_duration=selection_duration,
        nb_selections=nb_selections,
    )

    cycle_state = await channel_layer.get_cycle_state("group1")
    cycle_state["phase"] = "selection"
    cycle_state["cycle_start"] = time.time() - (generation_duration + selection_duration + 0.1)
    # Don't set current_selection_index, let tick advance it
    await channel_layer.set_cycle_state("group1", cycle_state)

    await channel_layer.tick_process("group1")

    process_state = await channel_layer.get_process_state("group1")
    assert process_state["current_cycle_index"] == 1

    cycle_state = await channel_layer.get_cycle_state("group1")
    assert cycle_state["phase"] == "generation"
    assert cycle_state["current_selection_index"] == 0


@pytest.mark.asyncio
async def test_tick_process_ends_at_last_cycle(channel_layer):
    """Test tick ends process when all cycles complete"""
    await channel_layer.start_process("group1", nb_cycles=1, start_time=1000.0, end_time=2000.0, current_result={})

    generation_duration = 2
    selection_duration = 1
    nb_selections = 1

    await channel_layer.start_cycle(
        "group1",
        generation_duration=generation_duration,
        selection_duration=selection_duration,
        nb_selections=nb_selections,
    )

    cycle_state = await channel_layer.get_cycle_state("group1")
    cycle_state["phase"] = "selection"
    cycle_state["cycle_start"] = time.time() - (generation_duration + selection_duration + 0.1)
    # Don't set current_selection_index, let tick advance it
    await channel_layer.set_cycle_state("group1", cycle_state)

    await channel_layer.tick_process("group1")

    process_state = await channel_layer.get_process_state("group1")
    assert process_state["status"] == "ended"
    assert process_state["current_cycle_index"] == 0


@pytest.mark.asyncio
async def test_start_cycle_direct(channel_layer):
    """Test start_cycle sets cycle state with provided values"""
    await channel_layer.start_cycle("group1", generation_duration=5, selection_duration=3, nb_selections=4)
    cycle_state = await channel_layer.get_cycle_state("group1")
    assert cycle_state["phase"] == "generation"
    assert cycle_state["generation_duration"] == 5
    assert cycle_state["selection_duration"] == 3
    assert cycle_state["nb_selections"] == 4
    assert cycle_state["current_selection_index"] == 0


@pytest.mark.asyncio
async def test_end_cycle_moves_to_next_or_ends(channel_layer):
    """Test end_cycle advances cycles and ends process"""
    await channel_layer.start_process("group1", nb_cycles=2, start_time=1000.0, end_time=2000.0, current_result={})
    await channel_layer.start_cycle("group1", generation_duration=1, selection_duration=1, nb_selections=1)

    process_state = await channel_layer.get_process_state("group1")
    assert process_state["current_cycle_index"] == 0

    await channel_layer.end_cycle("group1")
    process_state = await channel_layer.get_process_state("group1")
    assert process_state["current_cycle_index"] == 1
    assert process_state["status"] == "running"

    await channel_layer.end_cycle("group1")
    process_state = await channel_layer.get_process_state("group1")
    assert process_state["status"] == "ended"


@pytest.mark.asyncio
async def test_acquire_and_release_lock(channel_layer):
    """Test acquiring and releasing tick lock"""
    token1 = await channel_layer.acquire_tick_lock("group1")
    assert token1 is not None
    
    # Second attempt should fail
    token2 = await channel_layer.acquire_tick_lock("group1")
    assert token2 is None
    
    # Release first lock
    await channel_layer.release_tick_lock("group1", token1)
    
    # Now should be able to acquire
    token3 = await channel_layer.acquire_tick_lock("group1")
    assert token3 is not None
    assert token3 != token1


@pytest.mark.asyncio
async def test_lock_prevents_concurrent_ticking(channel_layer):
    """Test that lock prevents multiple instances from ticking simultaneously"""
    await channel_layer.start_process("group1", nb_cycles=1, start_time=1000.0, end_time=2000.0, current_result={})
    
    token1 = await channel_layer.acquire_tick_lock("group1")
    assert token1 is not None
    
    # Try to acquire while held
    token2 = await channel_layer.acquire_tick_lock("group1")
    assert token2 is None
    
    await channel_layer.release_tick_lock("group1", token1)


@pytest.mark.asyncio
async def test_wrong_token_cannot_release_lock(channel_layer):
    """Test that a lock can only be released with the correct token"""
    token1 = await channel_layer.acquire_tick_lock("group1")
    assert token1 is not None
    
    # Try to release with wrong token
    wrong_token = "wrong-token-123"
    await channel_layer.release_tick_lock("group1", wrong_token)
    
    # Lock should still be held
    token2 = await channel_layer.acquire_tick_lock("group1")
    assert token2 is None
    
    # Release with correct token
    await channel_layer.release_tick_lock("group1", token1)
    
    # Now should be able to acquire
    token3 = await channel_layer.acquire_tick_lock("group1")
    assert token3 is not None


@pytest.mark.asyncio
async def test_tick_loop_runs_and_stops(channel_layer):
    """Test tick loop runs continuously and stops when process ends"""
    await channel_layer.start_process("group1", nb_cycles=1, start_time=1000.0, end_time=2000.0, current_result={})
    
    # Create a task for the tick loop with short interval
    tick_task = asyncio.create_task(channel_layer.start_tick_loop("group1", tick_interval=0.1))
    
    # Let it tick a few times
    await asyncio.sleep(0.3)
    
    # End the process
    await channel_layer.end_process("group1")
    
    # Wait for tick loop to notice and exit
    try:
        await asyncio.wait_for(tick_task, timeout=2.0)
    except asyncio.TimeoutError:
        tick_task.cancel()
        pytest.fail("Tick loop did not stop after process ended")
    
    # Verify process is ended
    process_state = await channel_layer.get_process_state("group1")
    assert process_state["status"] == "ended"