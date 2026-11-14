<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class TenantUsage extends JsonSerializableType
{
    /**
     * @var int $assistantImages
     */
    #[JsonProperty('assistantImages')]
    public int $assistantImages;

    /**
     * @var int $assistantRequests
     */
    #[JsonProperty('assistantRequests')]
    public int $assistantRequests;

    /**
     * @var array<PlatformPosts> $byPlatform
     */
    #[JsonProperty('byPlatform'), ArrayType([PlatformPosts::class])]
    public array $byPlatform;

    /**
     * @var int $channelDays
     */
    #[JsonProperty('channelDays')]
    public int $channelDays;

    /**
     * @var int $channels
     */
    #[JsonProperty('channels')]
    public int $channels;

    /**
     * @var int $daysCounted
     */
    #[JsonProperty('daysCounted')]
    public int $daysCounted;

    /**
     * @var int $managedAds
     */
    #[JsonProperty('managedAds')]
    public int $managedAds;

    /**
     * @var ?string $externalId
     */
    #[JsonProperty('externalId')]
    public ?string $externalId;

    /**
     * @var bool $home
     */
    #[JsonProperty('home')]
    public bool $home;

    /**
     * @var ?int $mediaStorage
     */
    #[JsonProperty('mediaStorage')]
    public ?int $mediaStorage;

    /**
     * @var array<MeteredPosts> $meteredPosts
     */
    #[JsonProperty('meteredPosts'), ArrayType([MeteredPosts::class])]
    public array $meteredPosts;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

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
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   assistantImages: int,
     *   assistantRequests: int,
     *   byPlatform: array<PlatformPosts>,
     *   channelDays: int,
     *   channels: int,
     *   daysCounted: int,
     *   managedAds: int,
     *   home: bool,
     *   meteredPosts: array<MeteredPosts>,
     *   name: string,
     *   outboundMessages: int,
     *   publishedPosts: int,
     *   workspaceId: string,
     *   externalId?: ?string,
     *   mediaStorage?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->assistantImages = $values['assistantImages'];
        $this->assistantRequests = $values['assistantRequests'];
        $this->byPlatform = $values['byPlatform'];
        $this->channelDays = $values['channelDays'];
        $this->channels = $values['channels'];
        $this->daysCounted = $values['daysCounted'];
        $this->managedAds = $values['managedAds'];
        $this->externalId = $values['externalId'] ?? null;
        $this->home = $values['home'];
        $this->mediaStorage = $values['mediaStorage'] ?? null;
        $this->meteredPosts = $values['meteredPosts'];
        $this->name = $values['name'];
        $this->outboundMessages = $values['outboundMessages'];
        $this->publishedPosts = $values['publishedPosts'];
        $this->workspaceId = $values['workspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
