<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListBoostsAdsRequest extends JsonSerializableType
{
    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $postId
     */
    public ?string $postId;

    /**
     * @param array{
     *   cursor?: ?string,
     *   postId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->postId = $values['postId'] ?? null;
    }
}
