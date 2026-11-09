<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a TikTok account. Scheduling needs `privacyLevel`.
 */
class TikTokOptions extends JsonSerializableType
{
    /**
     * @var ?bool $aiGenerated
     */
    #[JsonProperty('aiGenerated')]
    public ?bool $aiGenerated;

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
     * @var ?value-of<TikTokPrivacyLevel> $privacyLevel
     */
    #[JsonProperty('privacyLevel')]
    public ?string $privacyLevel;

    /**
     * @param array{
     *   aiGenerated?: ?bool,
     *   brandContent?: ?bool,
     *   brandOrganic?: ?bool,
     *   commercialContent?: ?bool,
     *   disableComment?: ?bool,
     *   disableDuet?: ?bool,
     *   disableStitch?: ?bool,
     *   privacyLevel?: ?value-of<TikTokPrivacyLevel>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->aiGenerated = $values['aiGenerated'] ?? null;
        $this->brandContent = $values['brandContent'] ?? null;
        $this->brandOrganic = $values['brandOrganic'] ?? null;
        $this->commercialContent = $values['commercialContent'] ?? null;
        $this->disableComment = $values['disableComment'] ?? null;
        $this->disableDuet = $values['disableDuet'] ?? null;
        $this->disableStitch = $values['disableStitch'] ?? null;
        $this->privacyLevel = $values['privacyLevel'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
