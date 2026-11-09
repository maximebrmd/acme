<?php

namespace Peal\Analytics\Requests;

use Peal\Core\Json\JsonSerializableType;

class SummaryAnalyticsRequest extends JsonSerializableType
{
    /**
     * @var string $from
     */
    public string $from;

    /**
     * @var string $timeZone
     */
    public string $timeZone;

    /**
     * @var string $to
     */
    public string $to;

    /**
     * @param array{
     *   from: string,
     *   timeZone: string,
     *   to: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->from = $values['from'];
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'];
    }
}
