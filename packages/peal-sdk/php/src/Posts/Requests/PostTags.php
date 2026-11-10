<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostTags extends JsonSerializableType
{
    /**
     * @var array<string> $tagIds
     */
    #[JsonProperty('tagIds'), ArrayType(['string'])]
    public array $tagIds;

    /**
     * @param array{
     *   tagIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tagIds = $values['tagIds'];
    }
}
