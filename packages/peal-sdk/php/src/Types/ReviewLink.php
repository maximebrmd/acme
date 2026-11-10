<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReviewLink extends JsonSerializableType
{
    /**
     * @var value-of<ReviewLinkAccess> $access
     */
    #[JsonProperty('access')]
    public string $access;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?string $createdBy
     */
    #[JsonProperty('createdBy')]
    public ?string $createdBy;

    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var ?string $revokedAt
     */
    #[JsonProperty('revokedAt')]
    public ?string $revokedAt;

    /**
     * @var value-of<ReviewLinkStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   access: value-of<ReviewLinkAccess>,
     *   createdAt: string,
     *   expiresAt: string,
     *   id: string,
     *   postId: string,
     *   status: value-of<ReviewLinkStatus>,
     *   createdBy?: ?string,
     *   revokedAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->access = $values['access'];
        $this->createdAt = $values['createdAt'];
        $this->createdBy = $values['createdBy'] ?? null;
        $this->expiresAt = $values['expiresAt'];
        $this->id = $values['id'];
        $this->postId = $values['postId'];
        $this->revokedAt = $values['revokedAt'] ?? null;
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
