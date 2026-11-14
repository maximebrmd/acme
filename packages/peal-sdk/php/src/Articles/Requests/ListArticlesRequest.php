<?php

namespace Peal\Articles\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ArticleStateName;

class ListArticlesRequest extends JsonSerializableType
{
    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?value-of<ArticleStateName> $status
     */
    public ?string $status;

    /**
     * @param array{
     *   cursor?: ?string,
     *   limit?: ?string,
     *   status?: ?value-of<ArticleStateName>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->status = $values['status'] ?? null;
    }
}
