<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a Mastodon account, on every part of a thread. Scheduling needs none of them; a content warning counts in the text's limit.
 */
class MastodonOptions extends JsonSerializableType
{
    /**
     * @var ?string $contentWarning
     */
    #[JsonProperty('contentWarning')]
    public ?string $contentWarning;

    /**
     * @var ?string $language
     */
    #[JsonProperty('language')]
    public ?string $language;

    /**
     * @var ?value-of<MastodonQuotePolicy> $quotePolicy
     */
    #[JsonProperty('quotePolicy')]
    public ?string $quotePolicy;

    /**
     * @var ?bool $sensitive
     */
    #[JsonProperty('sensitive')]
    public ?bool $sensitive;

    /**
     * @var ?value-of<MastodonVisibility> $visibility
     */
    #[JsonProperty('visibility')]
    public ?string $visibility;

    /**
     * @param array{
     *   contentWarning?: ?string,
     *   language?: ?string,
     *   quotePolicy?: ?value-of<MastodonQuotePolicy>,
     *   sensitive?: ?bool,
     *   visibility?: ?value-of<MastodonVisibility>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->contentWarning = $values['contentWarning'] ?? null;
        $this->language = $values['language'] ?? null;
        $this->quotePolicy = $values['quotePolicy'] ?? null;
        $this->sensitive = $values['sensitive'] ?? null;
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
