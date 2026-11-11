<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LivePostChange extends JsonSerializableType
{
    /**
     * @var ?bool $alreadyGone
     */
    #[JsonProperty('alreadyGone')]
    public ?bool $alreadyGone;

    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $finishedAt
     */
    #[JsonProperty('finishedAt')]
    public ?string $finishedAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<LivePostChangeKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var int $partsLeft
     */
    #[JsonProperty('partsLeft')]
    public int $partsLeft;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $requestedAt
     */
    #[JsonProperty('requestedAt')]
    public string $requestedAt;

    /**
     * @var value-of<LivePostChangeStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @param array{
     *   id: string,
     *   kind: value-of<LivePostChangeKind>,
     *   partsLeft: int,
     *   postId: string,
     *   requestedAt: string,
     *   status: value-of<LivePostChangeStatus>,
     *   targetId: string,
     *   alreadyGone?: ?bool,
     *   code?: ?string,
     *   finishedAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->alreadyGone = $values['alreadyGone'] ?? null;
        $this->code = $values['code'] ?? null;
        $this->finishedAt = $values['finishedAt'] ?? null;
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->partsLeft = $values['partsLeft'];
        $this->postId = $values['postId'];
        $this->requestedAt = $values['requestedAt'];
        $this->status = $values['status'];
        $this->targetId = $values['targetId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
