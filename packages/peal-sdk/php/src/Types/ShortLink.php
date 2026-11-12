<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ShortLink extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var int $clicks
     */
    #[JsonProperty('clicks')]
    public int $clicks;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $destination
     */
    #[JsonProperty('destination')]
    public string $destination;

    /**
     * @var bool $disabled
     */
    #[JsonProperty('disabled')]
    public bool $disabled;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var int $part
     */
    #[JsonProperty('part')]
    public int $part;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var ?string $shortUrl
     */
    #[JsonProperty('shortUrl')]
    public ?string $shortUrl;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @param array{
     *   channelId: string,
     *   clicks: int,
     *   createdAt: string,
     *   destination: string,
     *   disabled: bool,
     *   id: string,
     *   part: int,
     *   postId: string,
     *   targetId: string,
     *   shortUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->clicks = $values['clicks'];
        $this->createdAt = $values['createdAt'];
        $this->destination = $values['destination'];
        $this->disabled = $values['disabled'];
        $this->id = $values['id'];
        $this->part = $values['part'];
        $this->postId = $values['postId'];
        $this->shortUrl = $values['shortUrl'] ?? null;
        $this->targetId = $values['targetId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
