<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReviewComment extends JsonSerializableType
{
    /**
     * @var ?CommentAnchor $anchor
     */
    #[JsonProperty('anchor')]
    public ?CommentAnchor $anchor;

    /**
     * @var Reviewer $author
     */
    #[JsonProperty('author')]
    public Reviewer $author;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $parentId
     */
    #[JsonProperty('parentId')]
    public ?string $parentId;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var ?ReviewCommentResolved $resolved
     */
    #[JsonProperty('resolved')]
    public ?ReviewCommentResolved $resolved;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   author: Reviewer,
     *   createdAt: string,
     *   id: string,
     *   postId: string,
     *   text: string,
     *   anchor?: ?CommentAnchor,
     *   parentId?: ?string,
     *   resolved?: ?ReviewCommentResolved,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->anchor = $values['anchor'] ?? null;
        $this->author = $values['author'];
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->parentId = $values['parentId'] ?? null;
        $this->postId = $values['postId'];
        $this->resolved = $values['resolved'] ?? null;
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
