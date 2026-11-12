<?php

namespace Peal\Feeds\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListFeedsRequest extends JsonSerializableType
{
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
     *   cursor?: ?string,
     *   limit?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
    }
}
