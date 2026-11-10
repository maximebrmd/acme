<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class BulkResult extends JsonSerializableType
{
    /**
     * @var int $created
     */
    #[JsonProperty('created')]
    public int $created;

    /**
     * @var array<BulkPostResult> $items
     */
    #[JsonProperty('items'), ArrayType([BulkPostResult::class])]
    public array $items;

    /**
     * @var int $refused
     */
    #[JsonProperty('refused')]
    public int $refused;

    /**
     * @param array{
     *   created: int,
     *   items: array<BulkPostResult>,
     *   refused: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->created = $values['created'];
        $this->items = $values['items'];
        $this->refused = $values['refused'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
