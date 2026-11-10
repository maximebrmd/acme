# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPostApprovalRequested < Internal::Types::Model
      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"
    end
  end
end
