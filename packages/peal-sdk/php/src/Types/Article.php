<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Article extends JsonSerializableType
{
    /**
     * @var ?string $authorId
     */
    #[JsonProperty('authorId')]
    public ?string $authorId;

    /**
     * @var ArticleBody $body
     */
    #[JsonProperty('body')]
    public ArticleBody $body;

    /**
     * @var array<string> $categories
     */
    #[JsonProperty('categories'), ArrayType(['string'])]
    public array $categories;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?string $coverMediaId
     */
    #[JsonProperty('coverMediaId')]
    public ?string $coverMediaId;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?string $excerpt
     */
    #[JsonProperty('excerpt')]
    public ?string $excerpt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<ArticleSiteStatus> $siteStatus
     */
    #[JsonProperty('siteStatus')]
    public string $siteStatus;

    /**
     * @var ArticleState $state
     */
    #[JsonProperty('state')]
    public ArticleState $state;

    /**
     * @var array<string> $tags
     */
    #[JsonProperty('tags'), ArrayType(['string'])]
    public array $tags;

    /**
     * @var string $title
     */
    #[JsonProperty('title')]
    public string $title;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @param array{
     *   body: ArticleBody,
     *   categories: array<string>,
     *   channelId: string,
     *   createdAt: string,
     *   id: string,
     *   siteStatus: value-of<ArticleSiteStatus>,
     *   state: ArticleState,
     *   tags: array<string>,
     *   title: string,
     *   updatedAt: string,
     *   authorId?: ?string,
     *   coverMediaId?: ?string,
     *   excerpt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->body = $values['body'];
        $this->categories = $values['categories'];
        $this->channelId = $values['channelId'];
        $this->coverMediaId = $values['coverMediaId'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->excerpt = $values['excerpt'] ?? null;
        $this->id = $values['id'];
        $this->siteStatus = $values['siteStatus'];
        $this->state = $values['state'];
        $this->tags = $values['tags'];
        $this->title = $values['title'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
