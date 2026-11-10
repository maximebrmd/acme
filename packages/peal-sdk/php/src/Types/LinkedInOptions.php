<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * How a post goes out on a LinkedIn profile or company page. Scheduling needs none of them; a link (`linkUrl`) needs its `linkTitle`.
 */
class LinkedInOptions extends JsonSerializableType
{
    /**
     * @var ?bool $disableReshare
     */
    #[JsonProperty('disableReshare')]
    public ?bool $disableReshare;

    /**
     * @var ?string $documentTitle
     */
    #[JsonProperty('documentTitle')]
    public ?string $documentTitle;

    /**
     * @var ?string $linkDescription
     */
    #[JsonProperty('linkDescription')]
    public ?string $linkDescription;

    /**
     * @var ?string $linkTitle
     */
    #[JsonProperty('linkTitle')]
    public ?string $linkTitle;

    /**
     * @var ?string $linkUrl
     */
    #[JsonProperty('linkUrl')]
    public ?string $linkUrl;

    /**
     * @var ?array<LinkedInMention> $mentions
     */
    #[JsonProperty('mentions'), ArrayType([LinkedInMention::class])]
    public ?array $mentions;

    /**
     * @var ?value-of<LinkedInVisibility> $visibility
     */
    #[JsonProperty('visibility')]
    public ?string $visibility;

    /**
     * @param array{
     *   disableReshare?: ?bool,
     *   documentTitle?: ?string,
     *   linkDescription?: ?string,
     *   linkTitle?: ?string,
     *   linkUrl?: ?string,
     *   mentions?: ?array<LinkedInMention>,
     *   visibility?: ?value-of<LinkedInVisibility>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->disableReshare = $values['disableReshare'] ?? null;
        $this->documentTitle = $values['documentTitle'] ?? null;
        $this->linkDescription = $values['linkDescription'] ?? null;
        $this->linkTitle = $values['linkTitle'] ?? null;
        $this->linkUrl = $values['linkUrl'] ?? null;
        $this->mentions = $values['mentions'] ?? null;
        $this->visibility = $values['visibility'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
