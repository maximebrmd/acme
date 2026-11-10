<?php

namespace Peal\Activity\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListActivityRequest extends JsonSerializableType
{
    /**
     * @var ?string $actor
     */
    public ?string $actor;

    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?string $operation
     */
    public ?string $operation;

    /**
     * @param array{
     *   actor?: ?string,
     *   cursor?: ?string,
     *   limit?: ?string,
     *   operation?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->actor = $values['actor'] ?? null;
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->operation = $values['operation'] ?? null;
    }
}
