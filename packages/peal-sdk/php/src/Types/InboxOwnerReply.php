<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxOwnerReply extends JsonSerializableType
{
    /**
     * @var ?value-of<InboxOwnerReplyModeration> $moderation
     */
    #[JsonProperty('moderation')]
    public ?string $moderation;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @param array{
     *   text: string,
     *   updatedAt: string,
     *   moderation?: ?value-of<InboxOwnerReplyModeration>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->moderation = $values['moderation'] ?? null;
        $this->text = $values['text'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
