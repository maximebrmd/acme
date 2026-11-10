# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewLink < Internal::Types::Model
      field :access, -> { Peal::Types::ReviewLinkAccess }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :created_by, -> { String }, optional: false, nullable: true, api_name: "createdBy"

      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :id, -> { String }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :revoked_at, -> { String }, optional: false, nullable: true, api_name: "revokedAt"

      field :status, -> { Peal::Types::ReviewLinkStatus }, optional: false, nullable: false
    end
  end
end
