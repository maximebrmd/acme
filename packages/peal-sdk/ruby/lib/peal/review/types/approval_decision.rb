# frozen_string_literal: true

module Peal
  module Review
    module Types
      class ApprovalDecision < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :approval_id, -> { String }, optional: false, nullable: false, api_name: "approvalId"

        field :subject_hash, -> { String }, optional: false, nullable: false, api_name: "subjectHash"
      end
    end
  end
end
