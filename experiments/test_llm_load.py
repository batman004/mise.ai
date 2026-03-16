#!/usr/bin/env python3
"""
Load Testing Script for LLM Insights Generation
Tests scalability of the system under concurrent load.

Usage:
    python test_llm_load.py --base-url http://localhost:8000 --users 10 --concurrent 5
"""

import asyncio
import httpx
import time
import argparse
from datetime import datetime
from typing import List, Dict, Any
import json


class LoadTestResults:
    """Track load test results and metrics"""

    def __init__(self):
        self.jobs_created = []
        self.jobs_completed = []
        self.errors = []
        self.start_time = None
        self.end_time = None

    def add_job_created(self, user_id: int, job_id: int, elapsed: float):
        self.jobs_created.append({
            "user_id": user_id,
            "job_id": job_id,
            "elapsed": elapsed,
            "timestamp": time.time()
        })

    def add_job_completed(self, user_id: int, job_id: int, elapsed: float, status: str):
        self.jobs_completed.append({
            "user_id": user_id,
            "job_id": job_id,
            "elapsed": elapsed,
            "status": status,
            "timestamp": time.time()
        })

    def add_error(self, user_id: int, error: str):
        self.errors.append({
            "user_id": user_id,
            "error": error,
            "timestamp": time.time()
        })

    def get_stats(self) -> Dict[str, Any]:
        """Calculate and return statistics"""
        if not self.jobs_created:
            return {"error": "No jobs created"}

        create_times = [j["elapsed"] for j in self.jobs_created]
        complete_times = [j["elapsed"] for j in self.jobs_completed]

        total_time = (self.end_time - self.start_time) if self.end_time else 0

        stats = {
            "total_jobs_created": len(self.jobs_created),
            "total_jobs_completed": len(self.jobs_completed),
            "total_errors": len(self.errors),
            "success_rate": len(self.jobs_completed) / len(self.jobs_created) * 100,
            "total_time_seconds": total_time,
            "jobs_per_second": len(self.jobs_created) / total_time if total_time > 0 else 0,
            "avg_create_time_sec": sum(create_times) / len(create_times) if create_times else 0,
            "min_create_time_sec": min(create_times) if create_times else 0,
            "max_create_time_sec": max(create_times) if create_times else 0,
        }

        if complete_times:
            stats.update({
                "avg_complete_time_sec": sum(complete_times) / len(complete_times),
                "min_complete_time_sec": min(complete_times),
                "max_complete_time_sec": max(complete_times),
            })

        return stats


async def create_llm_job(client: httpx.AsyncClient, base_url: str, user_id: int) -> Dict[str, Any]:
    """Create an LLM insights job for a user"""
    start = time.time()
    url = f"{base_url}/llm/fixed-insights/{user_id}"
    
    try:
        response = await client.post(url, params={"limit": 10})
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True, 
                "user_id": user_id,
                "job_id": result.get("job_id"), 
                "elapsed": elapsed
            }
        elif response.status_code == 404:
            # Likely no data for this user
            return {
                "success": False, 
                "user_id": user_id,
                "error": f"No data found for user {user_id}. Make sure data is uploaded first.", 
                "elapsed": elapsed
            }
        else:
            return {
                "success": False, 
                "user_id": user_id,
                "error": f"Status {response.status_code}: {response.text}", 
                "elapsed": elapsed
            }
    except Exception as e:
        elapsed = time.time() - start
        return {
            "success": False, 
            "user_id": user_id,
            "error": str(e), 
            "elapsed": elapsed
        }


async def check_job_status(
    client: httpx.AsyncClient,
    base_url: str,
    user_id: int,
    job_id: int,
    max_wait_seconds: int = 300
) -> Dict[str, Any]:
    """Poll job status until completion or timeout"""
    start = time.time()
    url = f"{base_url}/llm/fixed-insights/{user_id}"
    
    while time.time() - start < max_wait_seconds:
        try:
            response = await client.get(url, params={"job_id": job_id})
            
            if response.status_code == 200:
                result = response.json()
                status = result.get("status")
                
                if status == "completed":
                    elapsed = time.time() - start
                    return {
                        "success": True,
                        "status": "completed",
                        "elapsed": elapsed,
                        "result": result.get("result")
                    }
                elif status == "failed":
                    elapsed = time.time() - start
                    return {
                        "success": False,
                        "status": "failed",
                        "error": result.get("error", "Unknown error"),
                        "elapsed": elapsed
                    }
                # Still in progress, keep polling
                await asyncio.sleep(2)
            else:
                elapsed = time.time() - start
                return {
                    "success": False,
                    "error": f"Status {response.status_code}: {response.text}",
                    "elapsed": elapsed
                }
                
        except Exception as e:
            elapsed = time.time() - start
            return {"success": False, "error": str(e), "elapsed": elapsed}
    
    # Timeout
    elapsed = time.time() - start
    return {"success": False, "error": "Timeout waiting for job completion", "elapsed": elapsed}


async def test_user(
    client: httpx.AsyncClient,
    base_url: str,
    user_id: int,
    results: LoadTestResults
) -> Dict[str, Any]:
    """Test a single user's LLM job creation and completion"""
    # Create job
    create_result = await create_llm_job(client, base_url, user_id)
    
    if not create_result["success"]:
        results.add_error(user_id, create_result.get("error", "Unknown error"))
        return {"user_id": user_id, "success": False, "error": create_result.get("error")}
    
    job_id = create_result["job_id"]
    results.add_job_created(user_id, job_id, create_result["elapsed"])
    
    # Wait for completion
    complete_result = await check_job_status(client, base_url, user_id, job_id)
    
    if complete_result["success"]:
        results.add_job_completed(
            user_id,
            job_id,
            complete_result["elapsed"],
            complete_result.get("status", "completed")
        )
    else:
        results.add_error(user_id, complete_result.get("error", "Unknown error"))
    
    return {
        "user_id": user_id,
        "job_id": job_id,
        "success": complete_result["success"],
        "total_time": create_result["elapsed"] + complete_result["elapsed"]
    }


async def run_load_test(
    base_url: str,
    num_users: int,
    concurrent: int,
    start_user_id: int = 1,
    burst_mode: bool = False
):
    """Run load test with specified parameters
    
    If burst_mode is True, creates all jobs quickly to test KEDA autoscaling
    by filling the RabbitMQ queue and triggering worker scaling.
    """
    results = LoadTestResults()
    results.start_time = time.time()
    
    print(f"\n{'='*60}")
    print(f"LLM Insights Load Test - KEDA Scaling Test")
    print(f"{'='*60}")
    print(f"Base URL: {base_url}")
    print(f"Total Jobs: {num_users}")
    if burst_mode:
        print(f"Mode: BURST (fill queue to trigger scaling)")
    else:
        print(f"Mode: Sequential (wait for completion)")
    print(f"Concurrent Creation: {concurrent if not burst_mode else 'unlimited'}")
    print(f"Start User ID: {start_user_id}")
    print(f"{'='*60}\n")
    
    if burst_mode:
        # PHASE 1: Create ALL jobs as fast as possible to fill the queue
        print("PHASE 1: Creating jobs to fill queue...")
        create_start = time.time()
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            create_tasks = []
            for i in range(num_users):
                user_id = start_user_id + i
                task = create_llm_job(client, base_url, user_id)
                create_tasks.append(task)
            
            # Fire all requests
            create_results = await asyncio.gather(*create_tasks)
        
        create_time = time.time() - create_start
        
        # Track created jobs
        jobs_to_poll = []
        error_count = 0
        for result in create_results:
            if result.get("success"):
                user_id = result.get("user_id", 0)
                job_id = result.get("job_id")
                elapsed = result.get("elapsed", 0)
                results.add_job_created(user_id, job_id, elapsed)
                jobs_to_poll.append((user_id, job_id))
            else:
                user_id = result.get("user_id", 0)
                error_msg = result.get("error", "Unknown error")
                results.add_error(user_id, error_msg)
                error_count += 1
                # Print first few errors for debugging
                if error_count <= 3:
                    print(f"  ⚠ User {user_id}: {error_msg}")
        
        if error_count > 3:
            print(f"  ⚠ ... and {error_count - 3} more errors")
        
        print(f"✓ Created {len(jobs_to_poll)} jobs in {create_time:.2f}s")
        if len(jobs_to_poll) == 0:
            print(f"  ⚠ No jobs created! Make sure test data is uploaded first.")
            print(f"     Run: python generate_test_data.py --users {num_users}")
        else:
            print(f"  → Queue should now have {len(jobs_to_poll)} messages")
            print(f"  → KEDA should scale workers based on queue length")
        print()
        
        # PHASE 2: Poll for completion
        print(f"PHASE 2: Polling for job completion...")
        poll_start = time.time()
        
        async with httpx.AsyncClient(timeout=600.0) as client:
            poll_tasks = []
            for user_id, job_id in jobs_to_poll:
                task = check_job_status(client, base_url, user_id, job_id, max_wait_seconds=600)
                poll_tasks.append(task)
            
            poll_results = await asyncio.gather(*poll_tasks)
        
        poll_time = time.time() - poll_start
        
        # Track completed jobs
        for i, (user_id, job_id) in enumerate(jobs_to_poll):
            result = poll_results[i] if i < len(poll_results) else {}
            if result.get("success"):
                status = result.get("status", "completed")
                elapsed = result.get("elapsed", 0)
                results.add_job_completed(user_id, job_id, elapsed, status)
            else:
                results.add_error(user_id, result.get("error", "Polling failed"))
        
        print(f"✓ Polled {len(jobs_to_poll)} jobs in {poll_time:.2f}s\n")
        
    else:
        # Sequential mode: create and wait for each job
        semaphore = asyncio.Semaphore(concurrent)
        
        async def test_with_semaphore(client: httpx.AsyncClient, base_url: str, user_id: int, results: LoadTestResults):
            async with semaphore:
                return await test_user(client, base_url, user_id, results)
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            tasks = []
            for i in range(num_users):
                user_id = start_user_id + i
                task = test_with_semaphore(client, base_url, user_id, results)
                tasks.append(task)
            
            print(f"Starting {num_users} concurrent test tasks...\n")
            await asyncio.gather(*tasks)
    
    results.end_time = time.time()
    
    # Print results
    print_results(results)


def print_results(results: LoadTestResults):
    """Print test results"""
    stats = results.get_stats()
    
    print(f"\n{'='*60}")
    print(f"Test Results")
    print(f"{'='*60}\n")
    
    if "error" in stats:
        print(f"Error: {stats['error']}")
        return
    
    print(f"Jobs Created:        {stats['total_jobs_created']}")
    print(f"Jobs Completed:      {stats['total_jobs_completed']}")
    print(f"Errors:              {stats['total_errors']}")
    print(f"Success Rate:        {stats['success_rate']:.2f}%")
    print(f"\n--- Timing ---")
    print(f"Total Time:          {stats['total_time_seconds']:.2f}s")
    print(f"Jobs/Second:         {stats['jobs_per_second']:.2f}")
    print(f"\n--- Create Time ---")
    print(f"Avg:                 {stats['avg_create_time_sec']:.3f}s")
    print(f"Min:                 {stats['min_create_time_sec']:.3f}s")
    print(f"Max:                 {stats['max_create_time_sec']:.3f}s")
    
    if stats.get('avg_complete_time_sec'):
        print(f"\n--- Complete Time ---")
        print(f"Avg:                 {stats['avg_complete_time_sec']:.3f}s")
        print(f"Min:                 {stats['min_complete_time_sec']:.3f}s")
        print(f"Max:                 {stats['max_complete_time_sec']:.3f}s")
    
    print(f"\n{'='*60}\n")
    
    # Print errors if any
    if results.errors:
        print(f"Errors ({len(results.errors)}):")
        for error in results.errors[:10]:  # Show first 10
            print(f"  User {error['user_id']}: {error['error']}")
        if len(results.errors) > 10:
            print(f"  ... and {len(results.errors) - 10} more errors")


async def run_quick_test(base_url: str):
    """Quick test to verify the API is working"""
    print(f"\n{'='*60}")
    print(f"Quick API Test")
    print(f"{'='*60}\n")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print(f"Testing connection to {base_url}...")
        
        # Simple health check - try to get server info
        try:
            response = await client.get(f"{base_url}/")
            if response.status_code == 200:
                print("✓ Server is reachable\n")
            else:
                print(f"⚠ Server returned status {response.status_code}\n")
        except Exception as e:
            print(f"✗ Cannot connect to server: {e}\n")
            return
    
    print("Note: Make sure you have uploaded data for the users you want to test.")
    print("The API expects users with uploaded files in the database.\n")


def main():
    parser = argparse.ArgumentParser(description="Load test for LLM Insights API")
    parser.add_argument("--base-url", default="http://mise-ai.local/api",
                       help="Base URL of the API server (default: http://mise-ai.local/api)")
    parser.add_argument("--users", type=int, default=5,
                       help="Number of users to test (default: 5)")
    parser.add_argument("--concurrent", type=int, default=2,
                       help="Number of concurrent requests (default: 2)")
    parser.add_argument("--start-user-id", type=int, default=1,
                       help="Starting user ID (default: 1)")
    parser.add_argument("--quick-test", action="store_true",
                       help="Run a quick API connectivity test")
    parser.add_argument("--burst", action="store_true",
                       help="Burst mode: create all jobs quickly to test KEDA scaling")
    
    args = parser.parse_args()
    
    if args.quick_test:
        asyncio.run(run_quick_test(args.base_url))
    else:
        asyncio.run(run_load_test(
            args.base_url, 
            args.users, 
            args.concurrent, 
            args.start_user_id,
            burst_mode=args.burst
        ))


if __name__ == "__main__":
    main()

