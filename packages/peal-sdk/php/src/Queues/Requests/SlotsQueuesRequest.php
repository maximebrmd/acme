<?php

namespace Peal\Queues\Requests;

use Peal\Core\Json\JsonSerializableType;

class SlotsQueuesRequest extends JsonSerializableType
{
    /**
     * @var ?string $count
     */
    public ?string $count;

    /**
     * @param array{
     *   count?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->count = $values['count'] ?? null;
    }
}
