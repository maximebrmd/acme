<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Review\Types\NewCommentAnchor;
use Peal\Core\Json\JsonProperty;

class NewComment extends JsonSerializableType
{
    /**
     * @var ?NewCommentAnchor $anchor
     */
    #[JsonProperty('anchor')]
    public ?NewCommentAnchor $anchor;

    /**
     * @var ?string $parentId
     */
    #[JsonProperty('parentId')]
    public ?string $parentId;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   text: string,
     *   anchor?: ?NewCommentAnchor,
     *   parentId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->anchor = $values['anchor'] ?? null;
        $this->parentId = $values['parentId'] ?? null;
        $this->text = $values['text'];
    }
}
