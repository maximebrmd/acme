<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FeedPreviewItem extends JsonSerializableType
{
    /**
     * @var ?string $link
     */
    #[JsonProperty('link')]
    public ?string $link;

    /**
     * @var ?string $picture
     */
    #[JsonProperty('picture')]
    public ?string $picture;

    /**
     * @var ?string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public ?string $publishedAt;

    /**
     * @var ?string $summary
     */
    #[JsonProperty('summary')]
    public ?string $summary;

    /**
     * @var ?string $text
     */
    #[JsonProperty('text')]
    public ?string $text;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @param array{
     *   link?: ?string,
     *   picture?: ?string,
     *   publishedAt?: ?string,
     *   summary?: ?string,
     *   text?: ?string,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->link = $values['link'] ?? null;
        $this->picture = $values['picture'] ?? null;
        $this->publishedAt = $values['publishedAt'] ?? null;
        $this->summary = $values['summary'] ?? null;
        $this->text = $values['text'] ?? null;
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
