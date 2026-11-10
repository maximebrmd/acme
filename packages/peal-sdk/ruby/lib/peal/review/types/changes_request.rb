# frozen_string_literal: true

module Peal
  module Review
    module Types
      class ChangesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :approval_id, -> { String }, optional: false, nullable: false, api_name: "approvalId"

        field :subject_hash, -> { String }, optional: false, nullable: false, api_name: "subjectHash"

        field :comment, -> { String }, optional: false, nullable: false
      end
    end
  end
end
