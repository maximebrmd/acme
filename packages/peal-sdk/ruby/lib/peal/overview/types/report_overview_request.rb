# frozen_string_literal: true

module Peal
  module Overview
    module Types
      class ReportOverviewRequest < Internal::Types::Model
        field :days, -> { String }, optional: true, nullable: false

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false
      end
    end
  end
end
