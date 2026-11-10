# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ApprovalRequest < Internal::Types::Model
      field :decision, -> { Peal::Types::ApprovalRequestDecision }, optional: false, nullable: true

      field :id, -> { String }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :requested_at, -> { String }, optional: false, nullable: false, api_name: "requestedAt"

      field :requested_by, -> { String }, optional: false, nullable: true, api_name: "requestedBy"

      field :requested_by_name, -> { String }, optional: false, nullable: true, api_name: "requestedByName"

      field :requested_via, -> { Peal::Types::ApprovalOrigin }, optional: false, nullable: false, api_name: "requestedVia"

      field :schedule, -> { Peal::Types::PostSchedule }, optional: false, nullable: false

      field :status, -> { Peal::Types::ApprovalStatus }, optional: false, nullable: false

      field :subject_hash, -> { String }, optional: false, nullable: false, api_name: "subjectHash"
    end
  end
end
