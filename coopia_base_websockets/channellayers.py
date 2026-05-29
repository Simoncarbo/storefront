import time
import json
from channels_redis.core import RedisChannelLayer
import asyncio
import logging
import random
import uuid


class ChannelLayerForCoopiaProcess(RedisChannelLayer):
    """
    This class is used to connect the Coopia processes for each group.
    Current design choice: one Coopia process per group.
    """
   

    async def set_cycle_state(self, group, current_cycle_start_time, current_phase, nb_selections_done, current_phase_start_time, current_cycle_end_time=None, current_phase_end_time=None):
        # je pourrais aussi déduire current phase etc. a partir de current_cycle_start_time...
        assert self.require_valid_group_name(group), "Group name not valid"
        assert isinstance(current_cycle_start_time, (int, float)), "Invalid cycle start time"
        assert current_phase in ["generation", "selection"], "Invalid cycle phase"
        assert isinstance(current_phase_start_time, (int, float)), "Invalid phase start time"

        if current_phase_end_time is None:
            cycle_params = await self.get_cycle_params(group)
            current_phase_end_time = current_phase_start_time + cycle_params[current_phase + "_duration"]
        else:
            assert isinstance(current_phase_end_time, (int, float)), "Invalid phase end time"

        # compute cycle end time based on its parameters
        if current_cycle_end_time is None:
            cycle_params = await self.get_cycle_params(group)
            current_cycle_end_time = current_cycle_start_time + cycle_params["generation_duration"] + cycle_params["selection_duration"] * cycle_params["nb_selections"]
        else:
            assert isinstance(current_cycle_end_time, (int, float)), "Invalid cycle end time"



        key = f"{self.prefix}:cycle_state:{group}"
        cycle_state = {
            "current_cycle_start_time": current_cycle_start_time,
            "current_phase": current_phase,
            "nb_selections_done": nb_selections_done,
            "current_phase_start_time": current_phase_start_time,
            "current_phase_end_time": current_phase_end_time,
        }
        value = json.dumps(cycle_state)
        connection = self.connection(self.consistent_hash(group))

        try:
            await connection.set(key, value)
            await self.group_send(group, {"type": "send.cycle.state", "cycle_state": cycle_state})
        except Exception as e:
            logging.error(f"Failed to set cycle state for group {group}: {e}")
            raise
    
    async def get_cycle_state(self, group):
        assert self.require_valid_group_name(group), "Group name not valid"
        key = f"{self.prefix}:cycle_state:{group}"
        connection = self.connection(self.consistent_hash(group))
        try:
            value = await connection.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logging.error(f"Failed to get cycle state for group {group}: {e}")
        return None

    async def set_cycle_params(self, group, generation_duration, selection_duration, nb_selections):
        """
        """
        assert self.require_valid_group_name(group), "Group name not valid"
        # ensure generation_duration, selection_duration and nb_selections are positive integers
        assert isinstance(generation_duration, int) and generation_duration >= 0, "Invalid generation duration"
        assert isinstance(selection_duration, int) and selection_duration >= 0, "Invalid selection duration"
        assert isinstance(nb_selections, int) and nb_selections >= 0, "Invalid number of selections"

        key = f"{self.prefix}:cycle_params:{group}"
        cycle_params = {
            "generation_duration": generation_duration,
            "selection_duration": selection_duration,
            "nb_selections": nb_selections,
            "total_duration": generation_duration + selection_duration * nb_selections
        }
        value = json.dumps(cycle_params)
        connection = self.connection(self.consistent_hash(group))

        try:
            await connection.set(key, value)
            # await self.group_send(group, {"type": "send.cycle.params", "cycle_params": cycle_params})
        except Exception as e:
            logging.error(f"Failed to set cycle params for group {group}: {e}")
            raise
    
    async def get_cycle_params(self, group):
        assert self.require_valid_group_name(group), "Group name not valid"
        key = f"{self.prefix}:cycle_params:{group}"
        connection = self.connection(self.consistent_hash(group))
        try:
            value = await connection.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logging.error(f"Failed to get cycle params for group {group}: {e}")
        return None        

    async def tick(self, group):
        """
        Advance the process state based on time. Transitions phases and cycles as needed.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        cycle_state = await self.get_cycle_state(group)

        if not cycle_state:
            # raise warning
            logging.warning(f"Cycle state not found for group {group}")
            return

        current_time = time.time()

        if current_time >= cycle_state["current_phase_end_time"]:
            cycle_params = await self.get_cycle_params(group)
            if cycle_state["current_phase"] == "generation":
                # if 0 or 1 ideas, skip selection phases
                nb_ideas = await self.get_ideas_count(group)
                if nb_ideas <=1:
                    # broadcast best idea
                    await self.broadcast_best_idea(group, pop=True)

                    # reset ideas
                    await self.reset_ideas(group, partial=False)

                    # start next cycle
                    cycle_state["current_cycle_start_time"] = current_time
                    cycle_state["current_phase"] = "generation"
                    cycle_state["nb_selections_done"] = 0
                    cycle_state["current_phase_start_time"] = current_time
                    cycle_state["current_phase_end_time"] = current_time + cycle_params["generation_duration"]
                    await self.set_cycle_state(group, **cycle_state)
                else:
                    # switch to selection phase
                    cycle_state["current_phase"] = "selection"
                    cycle_state["nb_selections_done"] = 0
                    cycle_state["current_phase_start_time"] = current_time
                    cycle_state["current_phase_end_time"] = current_time + cycle_params["selection_duration"]
                    await self.set_cycle_state(group, **cycle_state)
            elif cycle_state["current_phase"] == "selection":
                # broadcast best idea
                await self.broadcast_best_idea(group, pop=True)

                if cycle_state["nb_selections_done"]+1 == cycle_params["nb_selections"]:
                    # reset ideas
                    await self.reset_ideas(group, partial=False)

                    # start next cycle
                    cycle_state["current_cycle_start_time"] = current_time
                    cycle_state["current_phase"] = "generation"
                    cycle_state["nb_selections_done"] = 0
                    cycle_state["current_phase_start_time"] = current_time
                    cycle_state["current_phase_end_time"] = current_time + cycle_params["generation_duration"]
                    await self.set_cycle_state(group, **cycle_state)
        
                elif cycle_state["nb_selections_done"]+1 < cycle_params["nb_selections"]:
                    # start next selection phase
                    cycle_state["nb_selections_done"] += 1
                    cycle_state["current_phase_start_time"] = current_time
                    cycle_state["current_phase_end_time"] = current_time + cycle_params["selection_duration"]
                    await self.set_cycle_state(group, **cycle_state)

        # return cycle_state["current_phase_end_time"]-current_time

    

    async def add_idea(self, group, idea):
        """
        Add an idea to the group with initial weight = 1.0 in a Redis sorted set.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        # ideas can be added only if current_phase = generation
        cycle_state = await self.get_cycle_state(group)
        if not cycle_state["current_phase"] == "generation":
            # raise warning
            logging.warning(f"Attempted to add idea '{idea}' to group {group} outside of generation phase")
            return
        
        ideas_key = f"{self.prefix}:ideas:{group}"
        index = self.consistent_hash(group)
        connection = self.connection(index)
        
        try:
            await connection.zadd(ideas_key, {idea: 1.0})
        except Exception as e:
            logging.error(f"Failed to add idea '{idea}' to group {group}: {e}")
            raise

    async def get_ideas_count(self, group):
        """
        Get the number of ideas for the group.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        ideas_key = f"{self.prefix}:ideas:{group}"
        connection = self.connection(self.consistent_hash(group))

        try:
            count = await connection.zcard(ideas_key)
            return count
        except Exception as e:
            logging.error(f"Failed to get ideas count for group {group}: {e}")
            return 0

    async def reset_ideas(self, group, partial = False):
        """
        Clear ideas for the group from Redis.

        Args:
            group: Group name
            partial: If True, only delete ideas with score <= 1.0 and
                      reset remaining ideas' scores to 1.0. If False,
                      delete the entire ideas key.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        ideas_key = f"{self.prefix}:ideas:{group}"
        cdf_key = f"{self.prefix}:ideas:cdf:{group}"
        index = self.consistent_hash(group)
        connection = self.connection(index)

        try:
            if partial:
                # Remove ideas with score <= 1.0
                await connection.zremrangebyscore(ideas_key, "-inf", 1.0)

                # Reset remaining ideas' scores to 1.0
                remaining = await connection.zrange(ideas_key, 0, -1)
                if remaining:
                    mapping = {}
                    for member in remaining:
                        if isinstance(member, bytes):
                            key = member.decode('utf-8')
                        else:
                            key = member
                        mapping[key] = 1.0

                    # Overwrite scores in one command
                    await connection.zadd(ideas_key, mapping)
            else:
                await connection.delete(ideas_key)

            # Clear any cached CDF so it will be rebuilt on next sampling
            try:
                await connection.delete(cdf_key)
            except Exception:
                # Non-fatal if cdf key removal fails
                pass
        except Exception as e:
            logging.error(f"Failed to reset ideas for group {group}: {e}")
            raise

    async def register_preference(self, group, winner, loser, preference_factor=1.4):
        """
        Update weights according to a binary preference:
        - multiply the winner weight by factor
        - divide the loser weight by factor
        If an idea is unknown, add it with default weight 1.0 first.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        # preferences can be registered only if current_phase = selection
        cycle_state = await self.get_cycle_state(group)
        if not cycle_state["current_phase"] == "selection":
            # raise warning
            logging.warning(f"Attempted to register preference for group {group} outside of selection phase")
            return
        
        ideas_key = f"{self.prefix}:ideas:{group}"
        index = self.consistent_hash(group)
        connection = self.connection(index)
        
        try:
            # Ensure ideas exist with default weight 1.0
            await connection.zadd(ideas_key, {winner: 1.0}, nx=True)
            await connection.zadd(ideas_key, {loser: 1.0}, nx=True)
            
            # Get current weights
            winner_weight = float(await connection.zscore(ideas_key, winner))
            loser_weight = float(await connection.zscore(ideas_key, loser))
            
            # Calculate new weights and update
            new_winner_weight = winner_weight * preference_factor
            new_loser_weight = loser_weight / preference_factor
            
            # Set new weights
            await connection.zadd(ideas_key, {winner: new_winner_weight})
            await connection.zadd(ideas_key, {loser: new_loser_weight})
        except Exception as e:
            logging.error(f"Failed to register preference for group {group}: {e}")
            raise

    async def broadcast_best_idea(self, group, pop=True):
        """
        Return the idea with the largest weight from the sorted set.
        If multiple ideas share the largest weight, pick one at random.
        Returns None if there are no ideas.
        
        Args:
            group: The group name
            pop: If True, remove the selected idea from the sorted set
        """
        assert self.require_valid_group_name(group), "Group name not valid"
        
        ideas_key = f"{self.prefix}:ideas:{group}"
        index = self.consistent_hash(group)
        connection = self.connection(index)
        
        try:
            # Get the maximum score
            max_score_result = await connection.zrevrange(ideas_key, 0, 0, withscores=True)
            if not max_score_result:
                return None
            
            max_score = max_score_result[0][1]
            
            # Get all ideas with the maximum score
            best_candidates = await connection.zrangebyscore(ideas_key, max_score, max_score)
            
            if not best_candidates:
                return None
            
            # Pick one at random and decode if bytes
            selected_idea = random.choice(best_candidates)
            if isinstance(selected_idea, bytes):
                selected_idea = selected_idea.decode('utf-8')
            
            # Pop if requested
            if pop:
                await connection.zrem(ideas_key, selected_idea)
            
            # broadcast selected idea to group
            await self.group_send(group, {"type": "send.cycle.result", "message": selected_idea})
        except Exception as e:
            logging.error(f"Failed to get best idea for group {group}: {e}")
            raise


    async def get_random_ideas(self, group, n, ttl_ms=250):
        """
        Atomically select n distinct ideas using weighted random sampling.
        Uses cached CDF with short TTL.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        ideas_key = f"{self.prefix}:ideas:{group}"
        cdf_key = f"{self.prefix}:ideas:cdf:{group}"

        index = self.consistent_hash(group)
        connection = self.connection(index)

        lua_script = """
        -- KEYS[1] = ideas_key (raw weights)
        -- KEYS[2] = cdf_key
        -- ARGV[1] = n (number of ideas)
        -- ARGV[2] = ttl_ms (CDF cache TTL)

        local ideas_key = KEYS[1]
        local cdf_key = KEYS[2]
        local n = tonumber(ARGV[1])
        local ttl_ms = tonumber(ARGV[2])

        -- Rebuild CDF if missing
        if redis.call("EXISTS", cdf_key) == 0 then
            local ideas = redis.call("ZRANGE", ideas_key, 0, -1, "WITHSCORES")
            if #ideas == 0 then
                return {}
            end

            local total = 0.0
            for i = 2, #ideas, 2 do
                total = total + tonumber(ideas[i])
            end

            redis.call("DEL", cdf_key)

            local cumulative = 0.0
            local count = #ideas / 2
            local idx = 0

            for i = 1, #ideas, 2 do
                idx = idx + 1
                local idea = ideas[i]
                local weight = tonumber(ideas[i + 1])

                if idx == count then
                    cumulative = 1.0
                else
                    cumulative = cumulative + (weight / total)
                end

                redis.call("ZADD", cdf_key, cumulative, idea)
            end

            redis.call("PEXPIRE", cdf_key, ttl_ms)
        end

        -- Sample n distinct ideas
        local results = {}
        local attempts = 0
        local max_attempts = n * 10  -- Allow more attempts to get distinct ideas

        while #results < n and attempts < max_attempts do
            attempts = attempts + 1
            local r = math.random()
            local pick = redis.call(
                "ZRANGEBYSCORE",
                cdf_key,
                r,
                "+inf",
                "LIMIT",
                0,
                1
            )

            if #pick > 0 then
                local idea = pick[1]
                local already = false
                for _, sel in ipairs(results) do
                    if sel == idea then
                        already = true
                        break
                    end
                end
                if not already then
                    table.insert(results, idea)
                end
            end
        end

        return results

        """

        try:
            result = await connection.eval(
                lua_script,
                2,
                ideas_key,
                cdf_key,
                n,
                ttl_ms,
            )
            # Decode bytes to strings
            return [idea.decode('utf-8') if isinstance(idea, bytes) else idea for idea in result]
        except Exception as e:
            logging.error(
                f"Failed to get weighted random ideas for group {group}: {e}"
            )
            raise





    async def group_send_unreliable(self, group, message):
        """
        Fire-and-forget group send using Redis Pub/Sub.
        Messages may be lost and are delivered at most once.
        For high-volume, low-criticality messages like number of participants.
        """
        assert self.require_valid_group_name(group), "Group name not valid"
        assert isinstance(message, dict), "message is not a dict"

        # Pub/Sub channel name (separate namespace!)
        pubsub_channel = f"{self.prefix}:pubsub:{group}"

        # Serialize message
        payload = self.serialize(message)

        # Pick shard based on group for locality
        index = self.consistent_hash(group)
        connection = self.connection(index)

        # Publish (no persistence, no guarantees)
        try:
            await connection.publish(pubsub_channel, payload)
        except Exception as e:
            logging.error(f"Failed to send unreliable message to group {group}: {e}")
            # Since it's unreliable, we don't raise the exception

    async def subscribe_unreliable_group(self, group):
        pubsub_channel = f"{self.prefix}:pubsub:{group}"

        index = self.consistent_hash(group)
        connection = self.connection(index)

        pubsub = connection.pubsub(ignore_subscribe_messages=True)
        await pubsub.subscribe(pubsub_channel)

        return pubsub
    
    async def listen_unreliable(self, pubsub):
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                yield self.deserialize(message["data"])
        except asyncio.CancelledError:
            # Task cancelled → unsubscribe cleanly
            pass
        finally:
            await pubsub.unsubscribe()
            await pubsub.close()

    async def get_group_size(self, group):
        key = self._group_key(group)
        connection = self.connection(self.consistent_hash(group))

        # Remove expired channels
        await connection.zremrangebyscore(
            key, min=0, max=int(time.time()) - self.group_expiry
        )

        # Return current number of channels
        return await connection.zcard(key)
    
    async def update_participant_count(self, group):
        size = await self.get_group_size(group)
        await self.group_send_unreliable(
            group,
            {
                "type": "send.participant.count",
                "count": size
            }
        )

    

    async def acquire_tick_lock(self, group, lock_ttl_ms=2000):
        """
        Acquire a Redis lock for ticking this process.
        Returns a lock token if successful, None if lock is held by another instance.
        Lock auto-expires after lock_ttl_ms to prevent deadlocks.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        lock_key = f"{self.prefix}:tick_lock:{group}"
        lock_token = str(uuid.uuid4())
        index = self.consistent_hash(group)
        connection = self.connection(index)

        try:
            # SET with NX (only if not exists) and PX (expire in milliseconds)
            result = await connection.set(
                lock_key,
                lock_token,
                nx=True,
                px=lock_ttl_ms
            )
            if result:
                return lock_token
            return None
        except Exception as e:
            logging.error(f"Failed to acquire tick lock for group {group}: {e}")
            return None

    async def release_tick_lock(self, group, lock_token):
        """
        Release a Redis lock if the provided token matches the current lock holder.
        Uses Lua script to ensure atomic compare-and-delete.
        """
        assert self.require_valid_group_name(group), "Group name not valid"

        lock_key = f"{self.prefix}:tick_lock:{group}"
        index = self.consistent_hash(group)
        connection = self.connection(index)

        lua_script = """
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
        """

        try:
            await connection.eval(lua_script, 1, lock_key, lock_token)
        except Exception as e:
            logging.error(f"Failed to release tick lock for group {group}: {e}")

    async def get_active_groups(self):
        """Return group names that currently have cycle state set."""
        # keys command can be expensive; depending on load, review for production
        key_pattern = f"{self.prefix}:cycle_state:*"
        index = self.consistent_hash("__coopia_group_index__")
        connection = self.connection(index)

        try:
            keys = await connection.keys(key_pattern)
            groups = []
            for key in keys:
                if isinstance(key, bytes):
                    key = key.decode("utf-8")
                prefix = f"{self.prefix}:cycle_state:"
                if key.startswith(prefix):
                    groups.append(key[len(prefix):])
            return groups
        except Exception as e:
            logging.error(f"Failed to fetch active groups: {e}")
            return []

    async def start_global_tick_loop(self, tick_interval=0.5, lock_ttl_ms=400):
        """Periodic loop that ticks all active groups with a distributed lock."""
        while True:
            groups = await self.get_active_groups()
            
            if not groups:
                await asyncio.sleep(tick_interval)
                continue

            for group in groups:
                try:
                    lock_token = await self.acquire_tick_lock(group, lock_ttl_ms)
                    if not lock_token:
                        continue
                    try:
                        await self.tick(group)
                    finally:
                        await self.release_tick_lock(group, lock_token)
                except Exception as e:
                    logging.error(f"Error in global tick for group {group}: {e}")

            await asyncio.sleep(tick_interval)
