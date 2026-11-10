<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Types\PostContent;
use Peal\Types\ChannelOptions;
use Peal\Types\PostTiming;

class PostToValidate extends JsonSerializableType
{
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
     * @var ?string $signatureId
     */
    #[JsonProperty('signatureId')]
    public ?string $signatureId;

    /**
     * @var ?PostTiming $when
     */
    #[JsonProperty('when')]
    public ?PostTiming $when;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   content: PostContent,
     *   allowDuplicate?: ?bool,
     *   channelSets?: ?array<string>,
     *   defaultSignatures?: ?bool,
     *   options?: ?array<ChannelOptions>,
     *   signatureId?: ?string,
     *   when?: ?PostTiming,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowDuplicate = $values['allowDuplicate'] ?? null;
        $this->channelIds = $values['channelIds'];
        $this->channelSets = $values['channelSets'] ?? null;
        $this->content = $values['content'];
        $this->defaultSignatures = $values['defaultSignatures'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->signatureId = $values['signatureId'] ?? null;
        $this->when = $values['when'] ?? null;
    }
}
