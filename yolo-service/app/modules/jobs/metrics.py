"""HTTP metrics endpoint hosted by the worker process."""

from threading import Thread

import uvicorn
from fastapi import FastAPI

from app.modules.jobs.runner import Metrics, Queue


def create_metrics_app(metrics: Metrics, queue: Queue) -> FastAPI:
    app = FastAPI(title="Open Play worker metrics")

    @app.get("/metrics")
    def metrics_snapshot():
        return metrics.snapshot(queue.queue_depth())

    return app


def start_metrics_server(
    metrics: Metrics,
    queue: Queue,
    port: int = 8001,
) -> tuple[uvicorn.Server, Thread]:
    server = uvicorn.Server(
        uvicorn.Config(
            create_metrics_app(metrics, queue),
            host="0.0.0.0",
            port=port,
            log_level="warning",
        )
    )
    thread = Thread(target=server.run, name="worker-metrics", daemon=True)
    thread.start()
    return server, thread
