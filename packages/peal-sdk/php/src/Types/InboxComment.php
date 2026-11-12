<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxComment extends JsonSerializableType
{
    /**
     * @var ?InboxAuthor $author
     */
    #[JsonProperty('author')]
    public ?InboxAuthor $author;

    /**
     * @var ?value-of<InboxCommentForgotten> $forgotten
     */
    #[JsonProperty('forgotten')]
    public ?string $forgotten;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var bool $liked
     */
    #[JsonProperty('liked')]
    public bool $liked;

    /**
     * @var ?string $parentId
     */
    #[JsonProperty('parentId')]
    public ?string $parentId;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var string $receivedAt
     */
    #[JsonProperty('receivedAt')]
    public string $receivedAt;

    /**
     * @var value-of<InboxCommentState> $state
     */
    #[JsonProperty('state')]
    public string $state;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @var string $threadId
     */
    #[JsonProperty('threadId')]
    public string $threadId;

    /**
     * @var string $writtenAt
     */
    #[JsonProperty('writtenAt')]
    public string $writtenAt;

    /**
     * @param array{
     *   id: string,
     *   liked: bool,
     *   receivedAt: string,
     *   state: value-of<InboxCommentState>,
     *   text: string,
     *   threadId: string,
     *   writtenAt: string,
     *   author?: ?InboxAuthor,
     *   forgotten?: ?value-of<InboxCommentForgotten>,
     *   parentId?: ?string,
     *   permalink?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->author = $values['author'] ?? null;
        $this->forgotten = $values['forgotten'] ?? null;
        $this->id = $values['id'];
        $this->liked = $values['liked'];
        $this->parentId = $values['parentId'] ?? null;
        $this->permalink = $values['permalink'] ?? null;
        $this->receivedAt = $values['receivedAt'];
        $this->state = $values['state'];
        $this->text = $values['text'];
        $this->threadId = $values['threadId'];
        $this->writtenAt = $values['writtenAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
