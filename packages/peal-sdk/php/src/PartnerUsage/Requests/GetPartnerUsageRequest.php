<?php

namespace Peal\PartnerUsage\Requests;

use Peal\Core\Json\JsonSerializableType;

class GetPartnerUsageRequest extends JsonSerializableType
{
    /**
     * @var ?string $before
     */
    public ?string $before;

    /**
     * @var ?string $from
     */
    public ?string $from;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?string $to
     */
    public ?string $to;

    /**
     * @param array{
     *   before?: ?string,
     *   from?: ?string,
     *   limit?: ?string,
     *   to?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->before = $values['before'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->to = $values['to'] ?? null;
    }
}
