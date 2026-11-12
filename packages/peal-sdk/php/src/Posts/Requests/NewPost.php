<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Types\PostContent;
use Peal\Types\ChannelOptions;
use Peal\Types\PostTiming;

class NewPost extends JsonSerializableType
{
    /**
     * @var ?string $wait
     */
    public ?string $wait;

    /**
     * @var ?string $idempotencyKey
     */
    public ?string $idempotencyKey;

    /**
     * @var ?bool $allowDuplicate
     */
    #[JsonProperty('allowDuplicate')]
    public ?bool $allowDuplicate;

    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var ?array<string> $channelSets
     */
    #[JsonProperty('channelSets'), ArrayType(['string'])]
    public ?array $channelSets;

    /**
     * @var PostContent $content
     */
    #[JsonProperty('content')]
    public PostContent $content;

    /**
     * @var ?bool $defaultSignatures
     */
    #[JsonProperty('defaultSignatures')]
    public ?bool $defaultSignatures;

    /**
     * @var ?array<ChannelOptions> $options
     */
    #[JsonProperty('options'), ArrayType([ChannelOptions::class])]
    public ?array $options;

    /**
     * @var ?bool $shortenLinks
     */
    #[JsonProperty('shortenLinks')]
    public ?bool $shortenLinks;

    /**
     * @var ?string $signatureId
     */
    #[JsonProperty('signatureId')]
    public ?string $signatureId;

    /**
     * @var ?array<string> $tagIds
     */
    #[JsonProperty('tagIds'), ArrayType(['string'])]
    public ?array $tagIds;

    /**
     * @var PostTiming $when
     */
    #[JsonProperty('when')]
    public PostTiming $when;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   content: PostContent,
     *   when: PostTiming,
     *   wait?: ?string,
     *   idempotencyKey?: ?string,
     *   allowDuplicate?: ?bool,
     *   channelSets?: ?array<string>,
     *   defaultSignatures?: ?bool,
     *   options?: ?array<ChannelOptions>,
     *   shortenLinks?: ?bool,
     *   signatureId?: ?string,
     *   tagIds?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->wait = $values['wait'] ?? null;
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->allowDuplicate = $values['allowDuplicate'] ?? null;
        $this->channelIds = $values['channelIds'];
        $this->channelSets = $values['channelSets'] ?? null;
        $this->content = $values['content'];
        $this->defaultSignatures = $values['defaultSignatures'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->shortenLinks = $values['shortenLinks'] ?? null;
        $this->signatureId = $values['signatureId'] ?? null;
        $this->tagIds = $values['tagIds'] ?? null;
        $this->when = $values['when'];
    }
}
