import type { Exit, Tracer } from "effect";

/**
 * A span as tracing sees it while it runs, over the exporter's own span,
 * which is exported when it ends. `sampled` is the decision made when the
 * trace began, which every span under it follows and the services Peal
 * calls are told. `keeps` decides once more as the span ends: a span of a
 * trace that was not sampled is still exported when it says so, and is
 * dropped otherwise, never having reached the exporter.
 */
export class SampledSpan implements Tracer.Span {
  readonly _tag = "Span";

  readonly sampled: boolean;

  private readonly exported: Tracer.Span;

  private readonly keeps: (
    span: Tracer.Span,
    endTime: bigint,
    exit: Exit.Exit<unknown, unknown>
  ) => boolean;

  private dropped: Tracer.SpanStatus | undefined = undefined;

  constructor(options: {
    readonly exported: Tracer.Span;
    readonly keeps: SampledSpan["keeps"];
    readonly sampled: boolean;
  }) {
    this.exported = options.exported;
    this.keeps = options.keeps;
    this.sampled = options.sampled;
  }

  get name(): string {
    return this.exported.name;
  }

  get spanId(): string {
    return this.exported.spanId;
  }

  get traceId(): string {
    return this.exported.traceId;
  }

  get parent(): Tracer.Span["parent"] {
    return this.exported.parent;
  }

  get annotations(): Tracer.Span["annotations"] {
    return this.exported.annotations;
  }

  get status(): Tracer.SpanStatus {
    return this.dropped ?? this.exported.status;
  }

  get attributes(): ReadonlyMap<string, unknown> {
    return this.exported.attributes;
  }

  get links(): readonly Tracer.SpanLink[] {
    return this.exported.links;
  }

  get kind(): Tracer.SpanKind {
    return this.exported.kind;
  }

  end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
    const { status } = this;

    if (status._tag === "Ended") {
      return;
    }

    if (this.sampled || this.keeps(this.exported, endTime, exit)) {
      this.exported.end(endTime, exit);

      return;
    }

    this.dropped = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: status.startTime,
    };
  }

  attribute(...attribute: Parameters<Tracer.Span["attribute"]>): void {
    this.exported.attribute(...attribute);
  }

  event(...event: Parameters<Tracer.Span["event"]>): void {
    this.exported.event(...event);
  }

  addLinks(links: readonly Tracer.SpanLink[]): void {
    this.exported.addLinks(links);
  }
}
