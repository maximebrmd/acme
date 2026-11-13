<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class UsageDay extends JsonSerializableType
{
    /**
     * @var int $assistantImages
     */
    #[JsonProperty('assistantImages')]
    public int $assistantImages;

    /**
     * @var ?int $assistantRequests
     */
    #[JsonProperty('assistantRequests')]
    public ?int $assistantRequests;

    /**
     * @var ?int $billableAccounts
     */
    #[JsonProperty('billableAccounts')]
    public ?int $billableAccounts;

    /**
     * @var array<PlatformPosts> $byPlatform
     */
    #[JsonProperty('byPlatform'), ArrayType([PlatformPosts::class])]
    public array $byPlatform;

    /**
     * @var ?int $channels
     */
    #[JsonProperty('channels')]
    public ?int $channels;

    /**
     * @var string $day
     */
    #[JsonProperty('day')]
    public string $day;

    /**
     * @var ?int $mediaStorage
     */
    #[JsonProperty('mediaStorage')]
    public ?int $mediaStorage;

    /**
     * @var ?int $members
     */
    #[JsonProperty('members')]
    public ?int $members;

    /**
     * @var int $outboundMessages
     */
    #[JsonProperty('outboundMessages')]
    public int $outboundMessages;

    /**
     * @var int $publishedPosts
     */
    #[JsonProperty('publishedPosts')]
    public int $publishedPosts;

    /**
     * @param array{
     *   assistantImages: int,
     *   byPlatform: array<PlatformPosts>,
     *   day: string,
     *   outboundMessages: int,
     *   publishedPosts: int,
     *   assistantRequests?: ?int,
     *   billableAccounts?: ?int,
     *   channels?: ?int,
     *   mediaStorage?: ?int,
     *   members?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->assistantImages = $values['assistantImages'];
        $this->assistantRequests = $values['assistantRequests'] ?? null;
        $this->billableAccounts = $values['billableAccounts'] ?? null;
        $this->byPlatform = $values['byPlatform'];
        $this->channels = $values['channels'] ?? null;
        $this->day = $values['day'];
        $this->mediaStorage = $values['mediaStorage'] ?? null;
        $this->members = $values['members'] ?? null;
        $this->outboundMessages = $values['outboundMessages'];
        $this->publishedPosts = $values['publishedPosts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
