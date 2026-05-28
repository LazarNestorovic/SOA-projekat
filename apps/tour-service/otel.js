// OpenTelemetry setup for tour-service (Node.js)
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const {
	OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-grpc');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const {
	ExpressInstrumentation,
} = require('@opentelemetry/instrumentation-express');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const exporter = new OTLPTraceExporter({
	url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
});
const provider = new NodeTracerProvider({
	spanProcessors: [new BatchSpanProcessor(exporter)],
});
provider.register();

registerInstrumentations({
	instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

console.log('OpenTelemetry initialized for tour-service');
