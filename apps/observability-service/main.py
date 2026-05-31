from fastapi import FastAPI, Request, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import logging
import time
import os

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from pythonjsonlogger import jsonlogger

app = FastAPI()

# Setup JSON logging
logger = logging.getLogger("observability_service")
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter('%(asctime)s %(name)s %(levelname)s %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# OpenTelemetry tracer -> OTLP collector
otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
resource = Resource.create({"service.name": "observability-service"})
tracer_provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint.replace("http://", ""), insecure=True)
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(tracer_provider)
tracer = trace.get_tracer(__name__)

FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)

# Prometheus metrics endpoint
from prometheus_client import Counter
REQUESTS = Counter('observability_requests_total', 'Total requests')


@app.get("/health")
async def health():
    logger.info("health check")
    return {"status": "healthy", "service": "observability-service"}


@app.get("/trace")
async def create_trace():
    with tracer.start_as_current_span("manual-span"):
        logger.info("created trace span")
        REQUESTS.inc()
        return {"traced": True}


@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
