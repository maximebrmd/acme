<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CommentAnchor extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?CommentSelection $selection
     */
    #[JsonProperty('selection')]
    public ?CommentSelection $selection;

    /**
     * @param array{
     *   channelId: string,
     *   selection?: ?CommentSelection,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->selection = $values['selection'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
