<?php

namespace Peal\Notices\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class MarkNoticesRead extends JsonSerializableType
{
    /**
     * @var array<string> $ids
     */
    #[JsonProperty('ids'), ArrayType(['string'])]
    public array $ids;

    /**
     * @param array{
     *   ids: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->ids = $values['ids'];
    }
}
