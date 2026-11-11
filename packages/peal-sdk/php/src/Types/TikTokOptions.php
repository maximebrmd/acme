<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a TikTok account. Scheduling needs `privacyLevel`; `videoCoverTimestampMs` is for a video, `photoTitle`, `autoAddMusic` and `photoCoverIndex` for photos.
 */
class TikTokOptions extends JsonSerializableType
{
    /**
     * @var ?bool $aiGenerated
     */
    #[JsonProperty('aiGenerated')]
    public ?bool $aiGenerated;

    /**
     * @var ?bool $autoAddMusic
     */
    #[JsonProperty('autoAddMusic')]
    public ?bool $autoAddMusic;

    /**
     * @var ?bool $brandContent
     */
    #[JsonProperty('brandContent')]
    public ?bool $brandContent;

    /**
     * @var ?bool $brandOrganic
     */
    #[JsonProperty('brandOrganic')]
    public ?bool $brandOrganic;

    /**
     * @var ?bool $commercialContent
     */
    #[JsonProperty('commercialContent')]
    public ?bool $commercialContent;

    /**
     * @var ?bool $disableComment
     */
    #[JsonProperty('disableComment')]
    public ?bool $disableComment;

    /**
     * @var ?bool $disableDuet
     */
    #[JsonProperty('disableDuet')]
    public ?bool $disableDuet;

    /**
     * @var ?bool $disableStitch
     */
    #[JsonProperty('disableStitch')]
    public ?bool $disableStitch;

    /**
     * @var ?int $photoCoverIndex
     */
    #[JsonProperty('photoCoverIndex')]
    public ?int $photoCoverIndex;

    /**
     * @var ?string $photoTitle
     */
    #[JsonProperty('photoTitle')]
    public ?string $photoTitle;

    /**
     * @var ?value-of<TikTokPrivacyLevel> $privacyLevel
     */
    #[JsonProperty('privacyLevel')]
    public ?string $privacyLevel;

    /**
     * @var ?int $videoCoverTimestampMs
     */
    #[JsonProperty('videoCoverTimestampMs')]
    public ?int $videoCoverTimestampMs;

    /**
     * @param array{
     *   aiGenerated?: ?bool,
     *   autoAddMusic?: ?bool,
     *   brandContent?: ?bool,
     *   brandOrganic?: ?bool,
     *   commercialContent?: ?bool,
     *   disableComment?: ?bool,
     *   disableDuet?: ?bool,
     *   disableStitch?: ?bool,
     *   photoCoverIndex?: ?int,
     *   photoTitle?: ?string,
     *   privacyLevel?: ?value-of<TikTokPrivacyLevel>,
     *   videoCoverTimestampMs?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->aiGenerated = $values['aiGenerated'] ?? null;
        $this->autoAddMusic = $values['autoAddMusic'] ?? null;
        $this->brandContent = $values['brandContent'] ?? null;
        $this->brandOrganic = $values['brandOrganic'] ?? null;
        $this->commercialContent = $values['commercialContent'] ?? null;
        $this->disableComment = $values['disableComment'] ?? null;
        $this->disableDuet = $values['disableDuet'] ?? null;
        $this->disableStitch = $values['disableStitch'] ?? null;
        $this->photoCoverIndex = $values['photoCoverIndex'] ?? null;
        $this->photoTitle = $values['photoTitle'] ?? null;
        $this->privacyLevel = $values['privacyLevel'] ?? null;
        $this->videoCoverTimestampMs = $values['videoCoverTimestampMs'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
