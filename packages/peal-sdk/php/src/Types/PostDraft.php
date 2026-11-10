<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostDraft extends JsonSerializableType
{
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
     * @param array{
     *   channelIds: array<string>,
     *   content: PostContent,
     *   channelSets?: ?array<string>,
     *   defaultSignatures?: ?bool,
     *   options?: ?array<ChannelOptions>,
     *   signatureId?: ?string,
     *   tagIds?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->channelSets = $values['channelSets'] ?? null;
        $this->content = $values['content'];
        $this->defaultSignatures = $values['defaultSignatures'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->signatureId = $values['signatureId'] ?? null;
        $this->tagIds = $values['tagIds'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
