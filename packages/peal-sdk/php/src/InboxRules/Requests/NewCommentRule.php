<?php

namespace Peal\InboxRules\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class NewCommentRule extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    #[JsonProperty('channelId')]
    public ?string $channelId;

    /**
     * @var array<string> $keywords
     */
    #[JsonProperty('keywords'), ArrayType(['string'])]
    public array $keywords;

    /**
     * @var ?string $postId
     */
    #[JsonProperty('postId')]
    public ?string $postId;

    /**
     * @var string $reply
     */
    #[JsonProperty('reply')]
    public string $reply;

    /**
     * @param array{
     *   keywords: array<string>,
     *   reply: string,
     *   channelId?: ?string,
     *   postId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->keywords = $values['keywords'];
        $this->postId = $values['postId'] ?? null;
        $this->reply = $values['reply'];
    }
}
