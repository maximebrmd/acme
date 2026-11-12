# frozen_string_literal: true

module Peal
  module Overview
    module Types
      class GetOverviewRequest < Internal::Types::Model
        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false
      end
    end
  end
end
