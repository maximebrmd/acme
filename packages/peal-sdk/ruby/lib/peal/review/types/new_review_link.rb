# frozen_string_literal: true

module Peal
  module Review
    module Types
      class NewReviewLink < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :access, -> { Peal::Types::ReviewLinkAccess }, optional: false, nullable: false

        field :expires_in_hours, -> { Integer }, optional: true, nullable: false, api_name: "expiresInHours"
      end
    end
  end
end
