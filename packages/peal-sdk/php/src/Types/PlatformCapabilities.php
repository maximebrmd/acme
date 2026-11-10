<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PlatformCapabilities extends JsonSerializableType
{
    /**
     * @var PlatformCapabilitiesAnalytics $analytics
     */
    #[JsonProperty('analytics')]
    public PlatformCapabilitiesAnalytics $analytics;

    /**
     * @var ?FollowUpCapabilities $followUps
     */
    #[JsonProperty('followUps')]
    public ?FollowUpCapabilities $followUps;

    /**
     * @var array<LookupDescription> $lookups
     */
    #[JsonProperty('lookups'), ArrayType([LookupDescription::class])]
    public array $lookups;

    /**
     * @var MediaCapabilities $media
     */
    #[JsonProperty('media')]
    public MediaCapabilities $media;

    /**
     * @var PlatformCapabilitiesOptions $options
     */
    #[JsonProperty('options')]
    public PlatformCapabilitiesOptions $options;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var TextCapabilities $text
     */
    #[JsonProperty('text')]
    public TextCapabilities $text;

    /**
     * @var int $version
     */
    #[JsonProperty('version')]
    public int $version;

    /**
     * @param array{
     *   analytics: PlatformCapabilitiesAnalytics,
     *   lookups: array<LookupDescription>,
     *   media: MediaCapabilities,
     *   options: PlatformCapabilitiesOptions,
     *   platform: value-of<Platform>,
     *   text: TextCapabilities,
     *   version: int,
     *   followUps?: ?FollowUpCapabilities,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->analytics = $values['analytics'];
        $this->followUps = $values['followUps'] ?? null;
        $this->lookups = $values['lookups'];
        $this->media = $values['media'];
        $this->options = $values['options'];
        $this->platform = $values['platform'];
        $this->text = $values['text'];
        $this->version = $values['version'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
