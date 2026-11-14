<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class UsageTotals extends JsonSerializableType
{
    /**
     * @var int $assistantImages
     */
    #[JsonProperty('assistantImages')]
    public int $assistantImages;

    /**
     * @var ?int $billableAccountDays
     */
    #[JsonProperty('billableAccountDays')]
    public ?int $billableAccountDays;

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
     * @var array<MeteredPosts> $meteredPosts
     */
    #[JsonProperty('meteredPosts'), ArrayType([MeteredPosts::class])]
    public array $meteredPosts;

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
     *   channelDays: int,
     *   daysCounted: int,
     *   managedAds: int,
     *   meteredPosts: array<MeteredPosts>,
     *   outboundMessages: int,
     *   publishedPosts: int,
     *   billableAccountDays?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->assistantImages = $values['assistantImages'];
        $this->billableAccountDays = $values['billableAccountDays'] ?? null;
        $this->byPlatform = $values['byPlatform'];
        $this->channelDays = $values['channelDays'];
        $this->daysCounted = $values['daysCounted'];
        $this->managedAds = $values['managedAds'];
        $this->meteredPosts = $values['meteredPosts'];
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
