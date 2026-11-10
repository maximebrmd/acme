<?php

namespace Peal\Review\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewCommentAnchor extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?NewCommentAnchorSelection $selection
     */
    #[JsonProperty('selection')]
    public ?NewCommentAnchorSelection $selection;

    /**
     * @param array{
     *   channelId: string,
     *   selection?: ?NewCommentAnchorSelection,
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
