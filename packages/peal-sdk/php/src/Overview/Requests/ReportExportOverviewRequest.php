<?php

namespace Peal\Overview\Requests;

use Peal\Core\Json\JsonSerializableType;

class ReportExportOverviewRequest extends JsonSerializableType
{
    /**
     * @var ?string $days
     */
    public ?string $days;

    /**
     * @var string $timeZone
     */
    public string $timeZone;

    /**
     * @param array{
     *   timeZone: string,
     *   days?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->days = $values['days'] ?? null;
        $this->timeZone = $values['timeZone'];
    }
}
