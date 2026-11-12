<?php

namespace Peal\Partner\Requests;

use Peal\Core\Json\JsonSerializableType;

class OverviewPartnerRequest extends JsonSerializableType
{
    /**
     * @var ?string $before
     */
    public ?string $before;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @param array{
     *   before?: ?string,
     *   limit?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->before = $values['before'] ?? null;
        $this->limit = $values['limit'] ?? null;
    }
}
