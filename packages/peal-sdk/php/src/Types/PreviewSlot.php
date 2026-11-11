<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PreviewSlot extends JsonSerializableType
{
    /**
     * @var string $at
     */
    #[JsonProperty('at')]
    public string $at;

    /**
     * @var ?string $postId
     */
    #[JsonProperty('postId')]
    public ?string $postId;

    /**
     * @param array{
     *   at: string,
     *   postId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->at = $values['at'];
        $this->postId = $values['postId'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
