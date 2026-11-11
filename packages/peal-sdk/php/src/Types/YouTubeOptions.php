<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`; `thumbnailMediaId` names an image of the library, set once the video is uploaded.
 */
class YouTubeOptions extends JsonSerializableType
{
    /**
     * @var ?string $categoryId
     */
    #[JsonProperty('categoryId')]
    public ?string $categoryId;

    /**
     * @var ?bool $containsSyntheticMedia
     */
    #[JsonProperty('containsSyntheticMedia')]
    public ?bool $containsSyntheticMedia;

    /**
     * @var ?string $defaultLanguage
     */
    #[JsonProperty('defaultLanguage')]
    public ?string $defaultLanguage;

    /**
     * @var ?bool $embeddable
     */
    #[JsonProperty('embeddable')]
    public ?bool $embeddable;

    /**
     * @var ?value-of<YouTubeLicense> $license
     */
    #[JsonProperty('license')]
    public ?string $license;

    /**
     * @var ?bool $madeForKids
     */
    #[JsonProperty('madeForKids')]
    public ?bool $madeForKids;

    /**
     * @var ?bool $notifySubscribers
     */
    #[JsonProperty('notifySubscribers')]
    public ?bool $notifySubscribers;

    /**
     * @var ?value-of<YouTubePrivacy> $privacy
     */
    #[JsonProperty('privacy')]
    public ?string $privacy;

    /**
     * @var ?bool $publicStatsViewable
     */
    #[JsonProperty('publicStatsViewable')]
    public ?bool $publicStatsViewable;

    /**
     * @var ?string $recordingDate
     */
    #[JsonProperty('recordingDate')]
    public ?string $recordingDate;

    /**
     * @var ?array<string> $tags
     */
    #[JsonProperty('tags'), ArrayType(['string'])]
    public ?array $tags;

    /**
     * @var ?string $thumbnailMediaId
     */
    #[JsonProperty('thumbnailMediaId')]
    public ?string $thumbnailMediaId;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @param array{
     *   categoryId?: ?string,
     *   containsSyntheticMedia?: ?bool,
     *   defaultLanguage?: ?string,
     *   embeddable?: ?bool,
     *   license?: ?value-of<YouTubeLicense>,
     *   madeForKids?: ?bool,
     *   notifySubscribers?: ?bool,
     *   privacy?: ?value-of<YouTubePrivacy>,
     *   publicStatsViewable?: ?bool,
     *   recordingDate?: ?string,
     *   tags?: ?array<string>,
     *   thumbnailMediaId?: ?string,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->categoryId = $values['categoryId'] ?? null;
        $this->containsSyntheticMedia = $values['containsSyntheticMedia'] ?? null;
        $this->defaultLanguage = $values['defaultLanguage'] ?? null;
        $this->embeddable = $values['embeddable'] ?? null;
        $this->license = $values['license'] ?? null;
        $this->madeForKids = $values['madeForKids'] ?? null;
        $this->notifySubscribers = $values['notifySubscribers'] ?? null;
        $this->privacy = $values['privacy'] ?? null;
        $this->publicStatsViewable = $values['publicStatsViewable'] ?? null;
        $this->recordingDate = $values['recordingDate'] ?? null;
        $this->tags = $values['tags'] ?? null;
        $this->thumbnailMediaId = $values['thumbnailMediaId'] ?? null;
        $this->title = $values['title'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
