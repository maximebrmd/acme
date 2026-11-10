<?php

namespace Peal\Analytics\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\AnalyticsExportFormat;
use Peal\Types\AnalyticsExportKind;

class ExportAnalyticsRequest extends JsonSerializableType
{
    /**
     * @var ?string $days
     */
    public ?string $days;

    /**
     * @var ?string $from
     */
    public ?string $from;

    /**
     * @var string $timeZone
     */
    public string $timeZone;

    /**
     * @var ?string $to
     */
    public ?string $to;

    /**
     * @var ?value-of<AnalyticsExportFormat> $format
     */
    public ?string $format;

    /**
     * @var value-of<AnalyticsExportKind> $kind
     */
    public string $kind;

    /**
     * @param array{
     *   timeZone: string,
     *   kind: value-of<AnalyticsExportKind>,
     *   days?: ?string,
     *   from?: ?string,
     *   to?: ?string,
     *   format?: ?value-of<AnalyticsExportFormat>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->days = $values['days'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'] ?? null;
        $this->format = $values['format'] ?? null;
        $this->kind = $values['kind'];
    }
}
