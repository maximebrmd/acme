<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ArticleInput extends JsonSerializableType
{
    /**
     * @var ArticleBody $body
     */
    #[JsonProperty('body')]
    public ArticleBody $body;

    /**
     * @var ?array<string> $categories
     */
    #[JsonProperty('categories'), ArrayType(['string'])]
    public ?array $categories;

    /**
     * @var ?string $coverMediaId
     */
    #[JsonProperty('coverMediaId')]
    public ?string $coverMediaId;

    /**
     * @var ?string $excerpt
     */
    #[JsonProperty('excerpt')]
    public ?string $excerpt;

    /**
     * @var ?value-of<ArticleSiteStatus> $siteStatus
     */
    #[JsonProperty('siteStatus')]
    public ?string $siteStatus;

    /**
     * @var ?array<string> $tags
     */
    #[JsonProperty('tags'), ArrayType(['string'])]
    public ?array $tags;

    /**
     * @var string $title
     */
    #[JsonProperty('title')]
    public string $title;

    /**
     * @param array{
     *   body: ArticleBody,
     *   title: string,
     *   categories?: ?array<string>,
     *   coverMediaId?: ?string,
     *   excerpt?: ?string,
     *   siteStatus?: ?value-of<ArticleSiteStatus>,
     *   tags?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
        $this->categories = $values['categories'] ?? null;
        $this->coverMediaId = $values['coverMediaId'] ?? null;
        $this->excerpt = $values['excerpt'] ?? null;
        $this->siteStatus = $values['siteStatus'] ?? null;
        $this->tags = $values['tags'] ?? null;
        $this->title = $values['title'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
