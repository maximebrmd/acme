<?php

namespace Peal\Overview\Requests;

use Peal\Core\Json\JsonSerializableType;

class ReportOverviewRequest extends JsonSerializableType
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
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @param array{
     *   timeZone: string,
     *   days?: ?string,
     *   cursor?: ?string,
     *   limit?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->days = $values['days'] ?? null;
        $this->timeZone = $values['timeZone'];
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
    }
}
